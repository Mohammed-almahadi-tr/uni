Imports System.Data.SqlClient

Public Class frmCloseYear

    Private Sub frmCloseYear_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim cmd As New SqlCommand("SELECT distinct Pack FROM Acc where pack is not null", cnn)
            Dim SqlReader As SqlDataReader

            Me.CombPack1.Items.Clear()
            Me.CombPack.Items.Clear()

            cnn.Open()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.CombPack1.Items.Add(SqlReader.Item(0))
                Me.CombPack.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.Message)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.CombPack1.SelectedIndex = -1 OrElse Me.CombAcc.SelectedIndex = -1 Then
            MsgBox("الرجاء إكمال البيانات")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                'Check for Done=0 records
                Dim cmdDone As New SqlCommand("Select Count(*) from Transactions where Done=0", cnn)
                cnn.Open()
                If CInt(cmdDone.ExecuteScalar) <> 0 Then
                    MsgBox("الرجاء ترصيد جميع البيانات أو حذفها")
                    cnn.Close()
                    Me.Cursor = Cursors.Default
                    Exit Sub
                End If
                cnn.Close()

                'Start closing the year
                Dim MoveNo As Integer = GetMoveNo(Me.DateTimePicker1.Value.Year)

                Dim cmd As New SqlCommand("Select Acc,SubAcc,Sum(TotalValueIn)-Sum(TotalValueOut) From Transactions " & _
                                          "Where Package=N'" & Me.CombPack1.SelectedItem & "' and Done=1 and " & _
                                          "TransDate<N'" & Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & _
                                          " 23:59:59' Group By Acc,SubAcc Having Sum(TotalValueIn)-Sum(TotalValueOut)<>0", cnn)
                Dim cmdIns As New SqlCommand
                Dim Reader As SqlDataReader

                cnn.Open()
                cmdIns.Connection = cnn1
                Reader = cmd.ExecuteReader
                While Reader.Read
                    Dim Dep, Crd As Double

                    If CDbl(Reader.Item(2).ToString) > 0 Then
                        Dep = CDbl(Reader.Item(2).ToString)
                    ElseIf CDbl(Reader.Item(2).ToString) < 0 Then
                        Crd = -1 * CDbl(Reader.Item(2).ToString)
                    End If

                    cmdIns.CommandText = "Insert Into Transactions (Descr,MoveNo,Package,Acc,SubAcc," & _
                                         "TotalValueIn,TotalValueOut,TransDate) Values (N'" & Me.txtDescr.Text.Trim & _
                                         "'," & MoveNo & ",N'" & Me.CombPack1.SelectedItem & "',N'" & Reader.Item(0) & _
                                         "',N'" & Reader.Item(1) & "'," & Crd & "," & Dep & ",N'" & _
                                         Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & " 10:10:10')"
                    cnn1.Open()
                    cmdIns.ExecuteNonQuery()
                    cnn1.Close()

                    Dep = 0
                    Crd = 0
                End While
                cnn.Close()

                Dim NetProfit As Double = GetPackBalance()
                Dim Profit, Loss As Double

                If NetProfit > 0 Then
                    Profit = NetProfit
                ElseIf NetProfit <= 0 Then
                    Loss = -1 * NetProfit
                End If

                Dim cmdInsNetProfit As New SqlCommand("Insert Into Transactions (Descr,MoveNo,Package,Acc,SubAcc," & _
                                         "TotalValueIn,TotalValueOut,TransDate) Values (N'" & Me.txtDescr.Text.Trim & _
                                         "'," & MoveNo & ",N'" & Me.CombPack.SelectedItem & "',N'" & Me.CombAcc.SelectedItem & _
                                         "',N'" & Me.CombSAcc.SelectedItem & "'," & Profit & "," & Loss & ",N'" & _
                                         Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & " 10:10:10')", cnn)

                cnn.Open()
                If NetProfit <> 0 Then
                    cmdInsNetProfit.ExecuteNonQuery()
                End If
                cnn.Close()

                PrintVoucher(MoveNo, Me.DateTimePicker1.Value.Year)
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                MsgBox(ex.Message)
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
            End Try
        End If
    End Sub

    Function GetPackBalance()
        Try
            Dim Balance As Double
            Dim cmdBalance As New SqlCommand("Select Sum(TotalValueIn)-Sum(TotalValueOut) From Transactions " & _
                                             "Where Package=N'" & Me.CombPack1.SelectedItem & "' and  Done=1 and " & _
                                             "TransDate<N'" & Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & " 23:59:59'", cnn1)

            cnn1.Open()
            Balance = CDbl(cmdBalance.ExecuteScalar.ToString)
            cnn1.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 0
        End Try
    End Function

    Private Sub CombPack_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombPack.SelectedIndexChanged
        If Me.CombPack.SelectedIndex = -1 Then
            Me.CombAcc.SelectedIndex = -1
            Me.CombSAcc.SelectedIndex = -1
            Me.CombAcc.Items.Clear()
            Me.CombSAcc.Items.Clear()
            Exit Sub
        End If
        Me.CombAcc.SelectedIndex = -1
        Me.CombSAcc.SelectedIndex = -1
        Me.CombAcc.Items.Clear()
        Me.CombSAcc.Items.Clear()
        Try
            Dim cmd1 As New SqlCommand("SELECT Distinct Acc FROM Acc where Pack =N'" & Me.CombPack.SelectedItem & "' and Acc is not Null", con)
            Dim SqlReader As SqlDataReader

            con.Open()
            Me.CombAcc.Items.Clear()
            Me.CombSAcc.Items.Clear()
            SqlReader = cmd1.ExecuteReader
            While SqlReader.Read
                Me.CombAcc.Items.Add(SqlReader.Item(0))
            End While
            con.Close()

        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                con.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub CombAcc_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombAcc.SelectedIndexChanged
        If Me.CombAcc.SelectedIndex = -1 Then
            Me.CombSAcc.SelectedIndex = -1
            Exit Sub
        End If
        Me.CombSAcc.SelectedIndex = -1
        Me.CombSAcc.Items.Clear()

        Try
            Dim strSelect As String
            strSelect = "SELECT distinct SubAcc FROM Acc WHERE Acc =N'" & Me.CombAcc.SelectedItem & _
                        "' and Pack =N'" & Me.CombPack.SelectedItem & "' AND SubAcc IS NOT NULL"
            Dim cmd As New SqlCommand(strSelect, con)
            Dim SqlReader As SqlDataReader

            Me.CombSAcc.SelectedIndex = -1
            Me.CombSAcc.Items.Clear()
            con.Open()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.CombSAcc.Items.Add(SqlReader.Item(0))
            End While
            SqlReader.Close()

            con.Close()
        Catch ex As Exception
            Try
                con.Close()
            Catch

            End Try
        End Try
    End Sub
End Class