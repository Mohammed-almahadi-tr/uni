Imports System.Data.SqlClient

Public Class frmDailyChainNew

    Sub Calculate()
        If Me.DataGridView1.Rows.Count = 0 Then
            Me.txtCrd.Text = "0"
            Me.txtDep.Text = "0"
            Me.txtBalance.Text = "0"
        Else
            Try
                Dim Crd, Dep As Double
                Dim i As Integer

                ' Iterate through a dictionary
                For i = 0 To Me.DataGridView1.Rows.Count - 1
                    Crd = Crd + Me.DataGridView1.Rows(i).Cells(5).Value
                    Dep = Dep + Me.DataGridView1.Rows(i).Cells(6).Value
                Next

                If Crd = 0 Then
                    Me.txtCrd.Text = "0.00"
                Else
                    Me.txtCrd.Text = Format(Crd, "##,###.##")
                End If

                If Dep = 0 Then
                    Me.txtDep.Text = "0.00"
                Else
                    Me.txtDep.Text = Format(Dep, "##,###.##")
                End If

                If Crd - Dep = 0 Then
                    Me.txtBalance.Text = "0.00"
                Else
                    Me.txtBalance.Text = Format(CDbl(Crd - Dep), "##,###.##")
                End If
            Catch ex As Exception
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub ComboBox2_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombPack.SelectedIndexChanged
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

    Private Sub combAccount_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombAcc.SelectedIndexChanged
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

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.CombPack.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ“„…")
        ElseIf Me.CombAcc.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ”«»")
        ElseIf Me.combChType.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ ‰Ê⁄ «·Õ—ﬂ…")
            Me.combChType.Focus()
        ElseIf Len(Me.txtAmount.Text) = 0 Then
            MsgBox("«·—Ã«¡ „—«Ã⁄… «·„»·€")
            Me.txtAmount.Focus()
            Exit Sub
        ElseIf Me.txtDescr.Text.Trim.Length = 0 Then
            MsgBox("«·—Ã«¡ ≈œŒ«· Ê’› «·ﬁÌœ")
            Me.txtDescr.Focus()
            Exit Sub
        Else
            Try
                'Validate amount
                Try
                    Dim X As Double = CDbl(Me.txtAmount.Text)
                Catch ex As Exception
                    MsgBox("«·—Ã«¡ „—«Ã⁄… «·„»·€")
                    Me.txtAmount.Clear()
                    Me.txtAmount.Focus()
                    Exit Sub
                End Try

                Dim Row(5) As String
                If Me.combChType.SelectedItem = "„œÌ‰" Then
                    Dim DepRow As String() = {Me.CombPack.SelectedItem, Me.CombAcc.SelectedItem, Me.CombSAcc.SelectedItem, _
                                              Me.txtDescr.Text.Trim, Me.txtCheqNo.Text.Trim, "0", Me.txtAmount.Text}
                    Row = DepRow
                Else
                    Dim CrdRow As String() = {Me.CombPack.SelectedItem, Me.CombAcc.SelectedItem, Me.CombSAcc.SelectedItem, _
                                              Me.txtDescr.Text.Trim, Me.txtCheqNo.Text.Trim, Me.txtAmount.Text, "0"}
                    Row = CrdRow
                End If

                Me.DataGridView1.Rows.Add(Row)
                Calculate()
                Me.combChType.SelectedIndex = -1
                Me.txtAmount.Clear()
            Catch ex As Exception
                MsgBox(ex.ToString)
                Try
                    cnn.Close()
                Catch

                End Try
            End Try
        End If
    End Sub

    Private Sub DataGridView1_RowsRemoved(ByVal sender As Object, ByVal e As System.Windows.Forms.DataGridViewRowsRemovedEventArgs) Handles DataGridView1.RowsRemoved
        Calculate()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.DataGridView1.Rows.Count = 0 Then
            Exit Sub
        ElseIf Me.txtDescr.Text.Trim.Length = 0 Then
            MsgBox("«·—Ã«¡ ≈œŒ«· Ê’› «·ﬁÌœ")
            Me.txtDescr.Focus()
            Exit Sub
        ElseIf CDbl(Me.txtCrd.Text - Me.txtDep.Text) <> 0 Then
            MsgBox("«·—Ã«¡ ≈ﬂ„«· «·ﬁÌœ Õ Ï Ì’»Õ «·—’Ìœ «·„ »ﬁÌ ’›—")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim MoveNo As Integer = GetMoveNo(Me.DateTimePicker1.Value.Year)

                Dim i As Integer
                Dim StrIns As String
                Dim cmd As New SqlCommand
                cmd.Connection = cnn

                cnn.Open()
                For i = 0 To Me.DataGridView1.Rows.Count - 1
                    StrIns = "Insert into Transactions (Descr,MoveNo,Package,Acc,SubAcc,ChNo" & _
                                                       ",TotalValueIn,TotalValueOut,TransType,TransDate) " & _
                             "Values (N'" & Me.DataGridView1.Rows(i).Cells(3).Value & "'," & MoveNo & ",N'" & _
                             Me.DataGridView1.Rows(i).Cells(0).Value & "',N'" & Me.DataGridView1.Rows(i).Cells(1).Value & _
                             "',N'" & Me.DataGridView1.Rows(i).Cells(2).Value & "',N'" & Me.DataGridView1.Rows(i).Cells(4).Value & _
                             "'," & Me.DataGridView1.Rows(i).Cells(5).Value & _
                             "," & Me.DataGridView1.Rows(i).Cells(6).Value & ",N'ﬁÌœ ÌÊ„Ì…',N'" & _
                             Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & " 10:10:10')"
                    cmd.CommandText = StrIns
                    cmd.ExecuteNonQuery()
                Next
                cnn.Close()

                MsgBox(" „ «·Õ›Ÿ")

                PrintVoucher(MoveNo, Me.DateTimePicker1.Value.Year)

                'Reset controls
                Me.DataGridView1.Rows.Clear()
                Me.CombPack.SelectedIndex = -1
                Me.combChType.SelectedIndex = -1
                Me.txtAmount.Clear()
                Me.txtDescr.Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                MsgBox(ex.ToString)
                Try
                    cnn.Close()
                Catch

                End Try
            End Try
        End If
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub

    Private Sub frmDailyChainNew_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim cmd As New SqlCommand("SELECT distinct Pack FROM Acc where pack is not null", cnn)
            Dim SqlReader As SqlDataReader

            cnn.Open()
            Me.CombPack.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.CombPack.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub
End Class