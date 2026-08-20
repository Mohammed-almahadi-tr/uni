Imports System.Data.SqlClient

Public Class frmVoucherEdit

    Dim TransDate As String

    Sub Clear()
        Me.DataGridView1.Rows.Clear()
        Me.combChType.SelectedIndex = -1
        Me.txtAmount.Clear()
        Me.txtDescr.Clear()
        Me.txtCrd.Text = "0.00"
        Me.txtDep.Text = "0.00"
        Me.txtBalance.Text = "0.00"
        Me.GroupBox4.Enabled = True
        Me.txtMoveNo.Clear()
        Me.txtMoveNo.Focus()
    End Sub

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
                    Crd = Crd + Me.DataGridView1.Rows(i).Cells(4).Value
                    Dep = Dep + Me.DataGridView1.Rows(i).Cells(5).Value
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

    Sub Fill()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select IsNull(Package,''),IsNull(Acc,''),IsNull(SubAcc,'')," & _
                                      "IsNull(Descr,''),TotalValueIn,TotalValueOut " & _
                                      "From Transactions Where MoveNo=" & Me.txtMoveNo.Text & _
                                      " and Year(TransDate)=" & Me.CombTransYear.SelectedItem, cnn)
            Dim Reader As SqlDataReader
            Dim cmdSelDate As New SqlCommand("Select TransDate From Transactions Where MoveNo=" & Me.txtMoveNo.Text & _
                                             " and Year(TransDate)=" & Me.CombTransYear.SelectedItem, cnn)

            Me.DataGridView1.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While (Reader.Read)
                Dim Row As String() = {Reader.Item(0), Reader.Item(1), Reader.Item(2), _
                                       Reader.Item(3), Reader.Item(4), Reader.Item(5)}
                Me.DataGridView1.Rows.Add(Row)
            End While

            Reader.Close()

            If Me.DataGridView1.Rows.Count > 0 Then
                TransDate = cmdSelDate.ExecuteScalar.ToString
            End If

            cnn.Close()

            If Me.DataGridView1.Rows.Count > 0 Then
                Calculate()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtMoveNo_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtMoveNo.KeyUp
        If e.KeyCode = Keys.Enter Then
            If Len(Me.txtMoveNo.Text) = 0 Then
                Exit Sub
            Else
                Fill()
                If Me.DataGridView1.RowCount > 0 Then
                    Me.GroupBox4.Enabled = False
                End If
            End If
        End If
    End Sub

    Private Sub txtMoveNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtMoveNo.TextChanged
        Me.DataGridView1.Rows.Clear()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.CombPack.SelectedIndex = -1 Then
            MsgBox("الرجاء تحديد الحزمة")
        ElseIf Me.CombAcc.SelectedIndex = -1 Then
            MsgBox("الرجاء تحديد الحساب")
        ElseIf Me.combChType.SelectedIndex = -1 Then
            MsgBox("الرجاء تحديد نوع الحركة")
            Me.combChType.Focus()
        ElseIf Len(Me.txtAmount.Text) = 0 Then
            MsgBox("الرجاء مراجعة المبلغ")
            Me.txtAmount.Focus()
            Exit Sub
        ElseIf Me.txtDescr.Text.Trim.Length = 0 Then
            MsgBox("الرجاء إدخال وصف القيد")
            Me.txtDescr.Focus()
            Exit Sub
        Else
            Try
                'Validate amount
                Try
                    Dim X As Double = CDbl(Me.txtAmount.Text)
                Catch ex As Exception
                    MsgBox("الرجاء مراجعة المبلغ")
                    Me.txtAmount.Clear()
                    Me.txtAmount.Focus()
                    Exit Sub
                End Try

                Me.Cursor = Cursors.Default
                Dim Row(5) As String
                If Me.combChType.SelectedItem = "مدين" Then
                    Dim DepRow As String() = {Me.CombPack.SelectedItem, Me.CombAcc.SelectedItem, Me.CombSAcc.SelectedItem, _
                                              Me.txtDescr.Text, "0", Me.txtAmount.Text}
                    Row = DepRow
                Else
                    Dim CrdRow As String() = {Me.CombPack.SelectedItem, Me.CombAcc.SelectedItem, Me.CombSAcc.SelectedItem, _
                                              Me.txtDescr.Text.Trim, Me.txtAmount.Text, "0"}
                    Row = CrdRow
                End If

                Me.DataGridView1.Rows.Add(Row)
                Calculate()
                Me.combChType.SelectedIndex = -1
                Me.txtAmount.Clear()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.DataGridView1.Rows.Count = 0 Then
            Exit Sub
        ElseIf CDbl(Me.txtCrd.Text - Me.txtDep.Text) <> 0 Then
            MsgBox("الرجاء إكمال القيد حتى يصبح الرصيد المتبقي صفر")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim MoveNo As Integer = CInt(Me.txtMoveNo.Text)
                Dim i As Integer
                Dim StrIns As String
                Dim cmd As New SqlCommand
                Dim cmdDel As New SqlCommand("Delete From Transactions Where MoveNo=" & _
                                             Me.txtMoveNo.Text & " and Year(TransDate)=" & Me.CombTransYear.SelectedItem, cnn)
                Dim Trans As SqlTransaction

                cmd.Connection = cnn

                cnn.Open()
                cmdDel.ExecuteNonQuery()
                Trans = cnn.BeginTransaction
                cmd.Transaction = Trans
                For i = 0 To Me.DataGridView1.Rows.Count - 1
                    StrIns = "Insert into Transactions (Descr,MoveNo,Package,Acc,SubAcc" & _
                                                       ",TotalValueIn,TotalValueOut,TransType,TransDate) " & _
                             "Values (N'" & Me.DataGridView1.Rows(i).Cells(3).Value & "'," & MoveNo & ",N'" & _
                             Me.DataGridView1.Rows(i).Cells(0).Value & "',N'" & Me.DataGridView1.Rows(i).Cells(1).Value & _
                             "',N'" & Me.DataGridView1.Rows(i).Cells(2).Value & _
                             "'," & Me.DataGridView1.Rows(i).Cells(4).Value & _
                             "," & Me.DataGridView1.Rows(i).Cells(5).Value & ",N'قيد يومية',N'" & TransDate & "')"
                    cmd.CommandText = StrIns
                    cmd.ExecuteNonQuery()
                Next
                Trans.Commit()
                cnn.Close()

                MsgBox("تم الحفظ")

                PrintVoucher(MoveNo, CInt(Me.CombTransYear.SelectedItem))

                'Reset controls
                Me.DataGridView1.Rows.Clear()
                Me.CombPack.SelectedIndex = -1
                Me.combChType.SelectedIndex = -1
                Me.txtAmount.Clear()
                Me.txtDescr.Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Clear()
    End Sub

    Private Sub DataGridView1_RowsRemoved(ByVal sender As Object, ByVal e As System.Windows.Forms.DataGridViewRowsRemovedEventArgs) Handles DataGridView1.RowsRemoved
        Calculate()
    End Sub

    Private Sub frmVoucherEdit_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
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

        Try
            Dim cmd As New SqlCommand("Select Distinct Year(TransDate) From Transactions", cnn)
            Dim SqlReader As SqlDataReader

            Me.CombTransYear.Items.Clear()

            cnn.Open()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.CombTransYear.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()

            If Me.CombTransYear.Items.Count > 0 Then
                Me.CombTransYear.SelectedIndex = 0
            End If
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

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

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub
End Class