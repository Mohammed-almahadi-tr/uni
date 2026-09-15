Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmMakePayBill

    Sub Clear()
        Me.txtAcc1.Clear()
        Me.txtAcc2.Clear()
        Me.txtAcc3.Clear()
        Me.txtAcc4.Clear()
        Me.txtAcc5.Clear()
        Me.txtDescr.Clear()
        Me.txtAmount.Clear()
        Me.txtSource.Clear()
        Me.GridVouchers.Rows.Clear()
        Me.txtWrittenValue.Clear()
        Me.DTPCheq.Value = Today.Date
        Me.DTPTrans.Value = Today.Date
        Me.RCash.Checked = True
    End Sub

    Sub FillTree1()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Distinct Acc1 From Acc1 Where Acc1 Is Not Null", cnn)
            Dim Reader, Reader1, Reader2, Reader3 As SqlDataReader
            Dim i, i1, i2, i3 As Integer

            Me.TreeAcc.Nodes.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.TreeAcc.Nodes.Add(Reader.Item(0))
                Dim cmd1 As New SqlCommand("Select Distinct Acc2 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and Acc2 Is Not Null", cnn1)

                cnn1.Open()
                Reader1 = cmd1.ExecuteReader
                While Reader1.Read
                    Me.TreeAcc.Nodes(i).Nodes.Add(Reader1.Item(0))
                    Dim cmd2 As New SqlCommand("Select Distinct Acc3 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                               "Acc2=N'" & Reader1.Item(0) & "' and Acc3 Is Not Null", cnn2)

                    cnn2.Open()
                    Reader2 = cmd2.ExecuteReader
                    While Reader2.Read
                        Me.TreeAcc.Nodes(i).Nodes(i1).Nodes.Add(Reader2.Item(0))
                        Dim cmd3 As New SqlCommand("Select Distinct Acc4 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                                  "Acc2=N'" & Reader1.Item(0) & "' and Acc3=N'" & Reader2.Item(0) & _
                                                  "' and Acc4 Is Not Null", cnn3)

                        cnn3.Open()
                        Reader3 = cmd3.ExecuteReader
                        While Reader3.Read
                            Me.TreeAcc.Nodes(i).Nodes(i1).Nodes(i2).Nodes.Add(Reader3.Item(0))
                        End While
                        cnn3.Close()
                        i2 += 1
                    End While
                    cnn2.Close()
                    i2 = 0
                    i1 += 1
                End While

                cnn1.Close()
                i2 = 0
                i1 = 0
                i += 1
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            If cnn3.State = ConnectionState.Open Then
                cnn3.Close()
            End If
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub FillTree()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Distinct Acc1 From Acc1 Where Acc1 Is Not Null", cnn)
            Dim Reader, Reader1, Reader2, Reader3, Reader4 As SqlDataReader
            Dim i, i1, i2, i3, i4 As Integer

            Me.TreeAcc.Nodes.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.TreeAcc.Nodes.Add(Reader.Item(0))
                Dim cmd1 As New SqlCommand("Select Distinct Acc2 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and Acc2 Is Not Null", cnn1)

                cnn1.Open()
                Reader1 = cmd1.ExecuteReader
                While Reader1.Read
                    Me.TreeAcc.Nodes(i).Nodes.Add(Reader1.Item(0))
                    Dim cmd2 As New SqlCommand("Select Distinct Acc3 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                               "Acc2=N'" & Reader1.Item(0) & "' and Acc3 Is Not Null", cnn2)

                    cnn2.Open()
                    Reader2 = cmd2.ExecuteReader
                    While Reader2.Read
                        Me.TreeAcc.Nodes(i).Nodes(i1).Nodes.Add(Reader2.Item(0))
                        Dim cmd3 As New SqlCommand("Select Distinct Acc4 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                                  "Acc2=N'" & Reader1.Item(0) & "' and Acc3=N'" & Reader2.Item(0) & _
                                                  "' and Acc4 Is Not Null", cnn3)

                        cnn3.Open()
                        Reader3 = cmd3.ExecuteReader
                        While Reader3.Read
                            Me.TreeAcc.Nodes(i).Nodes(i1).Nodes(i2).Nodes.Add(Reader3.Item(0))
                            'begin new code
                            Dim cmd4 As New SqlCommand("Select Distinct Acc5 From Acc1 Where Acc1=N'" & Reader.Item(0) & "' and " & _
                                                  "Acc2=N'" & Reader1.Item(0) & "' and Acc3=N'" & Reader2.Item(0) & _
                                                  "' and Acc4=N'" & Reader3.Item(0) & "' and Acc5 Is Not Null", cnn4)
                            cnn4.Open()
                            Reader4 = cmd4.ExecuteReader
                            While Reader4.Read
                                Me.TreeAcc.Nodes(i).Nodes(i1).Nodes(i2).Nodes(i3).Nodes.Add(Reader4.Item(0))
                                'end new code

                            End While
                            'new
                            cnn4.Close()
                            i3 += 1

                            'end
                        End While
                        cnn3.Close()

                        i2 += 1
                    End While
                    cnn2.Close()

                    i2 = 0
                    i1 += 1
                End While

                cnn1.Close()
                i3 = 0
                i2 = 0
                i1 = 0
                i += 1
            End While
            cnn.Close()


            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            If cnn3.State = ConnectionState.Open Then
                cnn3.Close()
            End If
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Private Sub frmPayBill_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillTree()
        Clear()

        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct Acc5 From Acc1 Where Acc1=N'Current Assets' " & _
                                     "and Acc2=N'Cash & Banks' and Acc3=N'Bank Accounts' and Acc4=N'Bank Accounts' and Acc5 Is Not Null", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.CombBank.Items.Add(Reader.Item(0))
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub RCash_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RCash.CheckedChanged
        CheckRadio()
    End Sub

    Sub CheckRadio()
        If RCash.Checked = True Then
            Me.txtChNo.Text = "Cash"
            Me.txtChNo.Enabled = False
            Me.CombBank.SelectedIndex = -1
            Me.CombBank.Enabled = False
            Me.DTPCheq.Value = Today.Date
            Me.DTPCheq.Enabled = False
            'hide
            Me.txtAc1.Visible = False
            Me.txtAc1.Clear()
            Me.txtAc2.Visible = False
            Me.txtAc2.Clear()
            Me.txtAc3.Visible = False
            Me.txtAc3.Clear()
            Me.txtAc4.Visible = False
            Me.txtAc4.Clear()
            Me.txtAc5.Visible = False
            Me.txtAc5.Clear()
            Me.btnSearch.Visible = False

        ElseIf RBank.Checked Then
            Me.txtChNo.Clear()
            Me.txtChNo.Enabled = True
            Me.CombBank.Enabled = True
            Me.txtChNo.Focus()
            Me.DTPCheq.Value = Today.Date
            Me.DTPCheq.Enabled = True
            'hide
            Me.txtAc1.Visible = False
            Me.txtAc1.Clear()
            Me.txtAc2.Visible = False
            Me.txtAc2.Clear()
            Me.txtAc3.Visible = False
            Me.txtAc3.Clear()
            Me.txtAc4.Visible = False
            Me.txtAc4.Clear()
            Me.txtAc5.Visible = False
            Me.txtAc5.Clear()
            Me.btnSearch.Visible = False
        Else
            Me.txtChNo.Text = "Other"
            Me.txtChNo.Enabled = False
            Me.CombBank.SelectedIndex = -1
            Me.CombBank.Enabled = False
            Me.DTPCheq.Value = Today.Date
            Me.DTPCheq.Enabled = False
            'hide
            Me.txtAc1.Visible = True
            Me.txtAc2.Visible = True
            Me.txtAc3.Visible = True
            Me.txtAc4.Visible = True
            Me.txtAc5.Visible = True
            Me.btnSearch.Visible = True

        End If
    End Sub

    Private Sub RBank_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RBank.CheckedChanged
        CheckRadio()
    End Sub

    Private Sub btnGSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnGSave.Click
        Me.ErrProv.Clear()
        If Me.txtSource.Text.Trim.Length = 0 Then
            Me.ErrProv.SetError(Me.txtSource, "Please fill in")
            Me.txtSource.Focus()
        ElseIf Me.txtDescr.Text.Trim.Length = 0 Then
            Me.ErrProv.SetError(Me.txtDescr, "Please fill in")
            Me.txtDescr.Focus()
        ElseIf Me.GridVouchers.Rows.Count = 0 Then
            Me.ErrProv.SetError(Me.txtAcc1, "Please fill in")
            Me.txtAcc1.Focus()
        Else
            If Me.RBank.Checked = True Then
                If Me.txtChNo.Text.Trim.Length = 0 Then
                    Me.ErrProv.SetError(Me.txtChNo, "Please fill in")
                    Me.txtChNo.Focus()
                    Exit Sub
                ElseIf Me.CombBank.SelectedIndex = -1 Then
                    Me.ErrProv.SetError(Me.CombBank, "Please fill in")
                    Me.CombBank.Focus()
                    Exit Sub
                End If
            End If
            If ROther.Checked Then
                Err.Clear()
                If txtAc1.Text.Length = 0 Or txtAc2.Text.Length = 0 Or txtAc3.Text.Length _
                = 0 Or txtAc4.Text.Length = 0 Or txtAc5.Text.Length = 0 Then
                    ErrProv.SetError(btnSearch, "Please select an account!")
                    Me.Cursor = Cursors.Default
                    Exit Sub
                End If
            End If

            Try
                Me.Cursor = Cursors.WaitCursor

                Dim MoveNo As Integer
                Dim SNo As Integer
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction
                Dim TransDate, PaymentType As String

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans

                'Get Trans. Date
                TransDate = "N'" & Me.DTPTrans.Value.ToString("MM/dd/yyyy") & " 10:10:10'"

                'Get Payment Type
                If Me.RCash.Checked = True Then
                    PaymentType = "Cash"
                ElseIf RBank.Checked Then
                    PaymentType = "Bank"
                Else
                    PaymentType = "Other"
                End If

                'Get Move No.
                cmd.CommandText = "Select IsNull(Max(MoveNo),0) From Transactionees Where Year(TransDate)=Year(Getdate())"
                MoveNo = CInt(cmd.ExecuteScalar) + 1

                'Get Bill No.
                cmd.CommandText = "Select IsNull(Max(SNo),0) From Transactionees Where Transtype=N'Pay Voucher' and PaymentType=N'" & PaymentType & "'"
                SNo = CInt(cmd.ExecuteScalar) + 1

                For Each row As DataGridViewRow In Me.GridVouchers.Rows
                    'Credit side
                    cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,Acc5,CostCenter," & _
                                      "ChNo,Writting,TotalValueOut,UserName,TransDate) " & _
                                      "Values (@MoveNo,@TransType,@PaymentType,@SNo,@Source,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@Acc5,@CostCenter,@ChNo," & _
                                      "@Writting,@TotalValueOut,@UserName," & TransDate & ")"

                    'Add values
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@TransType", "Pay Voucher")
                    cmd.Parameters.AddWithValue("@PaymentType", PaymentType)
                    cmd.Parameters.AddWithValue("@SNo", SNo)
                    cmd.Parameters.AddWithValue("@Source", Me.txtSource.Text.Trim)
                    cmd.Parameters.AddWithValue("@Descr", Me.txtDescr.Text.Trim)
                    cmd.Parameters.AddWithValue("@Acc1", row.Cells(0).Value)
                    cmd.Parameters.AddWithValue("@Acc2", row.Cells(1).Value)
                    cmd.Parameters.AddWithValue("@Acc3", row.Cells(2).Value)
                    cmd.Parameters.AddWithValue("@Acc4", row.Cells(3).Value)
                    cmd.Parameters.AddWithValue("@Acc5", row.Cells(4).Value)
                    cmd.Parameters.AddWithValue("@CostCenter", row.Cells(5).Value)
                    cmd.Parameters.AddWithValue("@ChNo", Me.txtChNo.Text.Trim)
                    cmd.Parameters.AddWithValue("@Writting", Me.txtWrittenValue.Text.Trim)
                    cmd.Parameters.AddWithValue("@TotalValueOut", CDbl(row.Cells(6).Value))
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.ExecuteNonQuery()
                Next


                'Debit Side
                cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,Acc5," & _
                                  "ChNo,CheqDate,Writting,TotalValueIn,UserName,TransDate) " & _
                                  "Values (@MoveNo,@TransType,@PaymentType,@SNo,@Source,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@Acc5,@ChNo," & _
                                  "@CheqDate,@Writting,@TotalValueIn,@UserName," & TransDate & ")"

                'Add values
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@TransType", "Pay Voucher")
                cmd.Parameters.AddWithValue("@PaymentType", PaymentType)
                cmd.Parameters.AddWithValue("@SNo", SNo)
                cmd.Parameters.AddWithValue("@Source", Me.txtSource.Text.Trim)
                cmd.Parameters.AddWithValue("@Descr", Me.txtDescr.Text.Trim)
               

                If RCash.Checked = True Then 'Cash
                    cmd.Parameters.AddWithValue("@Acc1", "Current Assets")
                    cmd.Parameters.AddWithValue("@Acc2", "Cash & Banks")
                    cmd.Parameters.AddWithValue("@Acc3", "Cash")
                    cmd.Parameters.AddWithValue("@Acc4", "Cash on Hand")
                    cmd.Parameters.AddWithValue("@Acc5", "Cash on Hand")
                    cmd.Parameters.AddWithValue("@CheqDate", DBNull.Value)
                ElseIf RBank.Checked Then
                    cmd.Parameters.AddWithValue("@Acc1", "Current Assets")
                    cmd.Parameters.AddWithValue("@Acc2", "Cash & Banks")
                    cmd.Parameters.AddWithValue("@Acc3", "Bank Accounts")
                    cmd.Parameters.AddWithValue("@Acc4", "Bank Accounts")
                    cmd.Parameters.AddWithValue("@Acc5", Me.CombBank.Text)
                    cmd.Parameters.AddWithValue("@CheqDate", Me.DTPCheq.Value)
                Else
                  

                    cmd.Parameters.AddWithValue("@Acc1", txtAc1.Text.Trim)
                    cmd.Parameters.AddWithValue("@Acc2", txtAc2.Text.Trim)
                    cmd.Parameters.AddWithValue("@Acc3", txtAc3.Text.Trim)
                    cmd.Parameters.AddWithValue("@Acc4", txtAc4.Text.Trim)
                    cmd.Parameters.AddWithValue("@Acc5", txtAc5.Text.Trim)
                    cmd.Parameters.AddWithValue("@CheqDate", DBNull.Value)
                End If

                cmd.Parameters.AddWithValue("@ChNo", Me.txtChNo.Text.Trim)
                cmd.Parameters.AddWithValue("@Writting", Me.txtWrittenValue.Text.Trim)
                cmd.Parameters.AddWithValue("@TotalValueIn", CDbl(Me.txtTotalAmount.Text.Trim))
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                MsgBox("Saved Successfully")

                PrintBill("Pay Voucher", PaymentType, SNo)
                'PrintCheq("Pay Voucher", SNo)
                PrintVoucher(MoveNo, Me.DTPTrans.Value.Year)

                Clear()

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
        Clear()
    End Sub

    Private Sub btnGClose_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnGClose.Click
        Me.Close()
    End Sub

    Private Sub TreeAcc_AfterSelect(sender As System.Object, e As System.Windows.Forms.TreeViewEventArgs)
        If e.Node.Level <> 4 Then
            Me.txtAcc1.Clear()
            Me.txtAcc2.Clear()
            Me.txtAcc3.Clear()
            Me.txtAcc4.Clear()
            Me.txtAcc5.Clear()
        Else
            Me.txtAcc1.Text = e.Node.Parent.Parent.Parent.Parent.Text
            Me.txtAcc2.Text = e.Node.Parent.Parent.Parent.Text
            Me.txtAcc3.Text = e.Node.Parent.Parent.Text
            Me.txtAcc4.Text = e.Node.Parent.Text
            Me.txtAcc5.Text = e.Node.Text
            Me.txtAmount.Focus()
        End If
    End Sub

    Private Sub Button2_Click(sender As System.Object, e As System.EventArgs) Handles Button2.Click
        Me.ErrProv.Clear()
        If Me.txtAcc1.Text.Trim.Length = 0 Then
            Me.ErrProv.SetError(Me.txtAcc1, "Please fill in")
        ElseIf Len(Me.txtAmount.Text) = 0 Then
            Me.ErrProv.SetError(Me.txtAmount, "Please fill in")
            Me.txtAmount.Focus()
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                'Validate amount
                Try
                    If CDbl(Me.txtAmount.Text) = 0 Then
                        Me.ErrProv.SetError(Me.txtAmount, "Please fill in")
                        Me.txtAmount.Focus()
                        Me.Cursor = Cursors.Default
                        Exit Sub
                    End If
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    Me.ErrProv.SetError(Me.txtAmount, "Please fill in")
                    Me.txtAmount.Clear()
                    Me.txtAmount.Focus()
                    Exit Sub
                End Try

                Me.GridVouchers.Rows.Add(New String() {Me.txtAcc1.Text, Me.txtAcc2.Text, Me.txtAcc3.Text, Me.txtAcc4.Text, Me.txtAcc5.Text, Me.ComboDepart.Text, _
                                                       CDbl(Me.txtAmount.Text).ToString("N2"), "Delete"})
                Calculate()

                Me.txtAcc1.Clear()
                Me.txtAcc2.Clear()
                Me.txtAcc3.Clear()
                Me.txtAcc4.Clear()
                Me.txtAcc5.Clear()
                Me.txtAmount.Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Sub Calculate()
        If Me.GridVouchers.Rows.Count = 0 Then
            Me.txtTotalAmount.Text = "0.00"
        Else
            Try
                Me.Cursor = Cursors.Default

                Dim TotalAmount As Double

                ' Iterate through the list
                For Each row As DataGridViewRow In Me.GridVouchers.Rows
                    TotalAmount += CDbl(row.Cells(6).Value)
                Next

                Me.txtTotalAmount.Text = TotalAmount.ToString("N2")

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button3_Click(sender As System.Object, e As System.EventArgs) Handles Button3.Click
        Dim a As New frmSelectAccount
        a.ShowDialog()

        If SelAcc1 <> "" Then
            Me.txtAcc1.Text = SelAcc1
            Me.txtAcc2.Text = SelAcc2
            Me.txtAcc3.Text = SelAcc3
            Me.txtAcc4.Text = SelAcc4
            Me.txtAcc5.Text = SelAcc5
        End If
    End Sub

    Private Sub txtTotalAmount_TextChanged(sender As System.Object, e As System.EventArgs) Handles txtTotalAmount.TextChanged
        Try
            If Me.txtTotalAmount.Text.Trim.Length = 0 Then
                Me.txtWrittenValue.Clear()
            Else
                Me.txtWrittenValue.Text = SpellNumber(CDbl(Me.txtTotalAmount.Text)).ToString

                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("دولار", "جنية")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("and No Cent", "")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text & " فقط"
            End If
        Catch ex As Exception
            Me.txtTotalAmount.Clear()
            Me.txtTotalAmount.Focus()
        End Try
    End Sub

    Private Sub GridVouchers_CellClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridVouchers.CellClick
        If e.ColumnIndex = 7 Then
            Me.GridVouchers.Rows.RemoveAt(e.RowIndex)
        End If
    End Sub

    Private Sub btnSearch_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnSearch.Click
        Dim a As New frmSelectAccount
        a.ShowDialog()

        If SelAcc1 <> "" Then
            Me.txtAc1.Text = SelAcc1
            Me.txtAc2.Text = SelAcc2
            Me.txtAc3.Text = SelAcc3
            Me.txtAc4.Text = SelAcc4
            Me.txtAc5.Text = SelAcc5
        End If
    End Sub

    Private Sub TreeAcc_AfterSelect_1(sender As System.Object, e As System.Windows.Forms.TreeViewEventArgs)
        If e.Node.Level <> 4 Then
            Me.txtAcc1.Clear()
            Me.txtAcc2.Clear()
            Me.txtAcc3.Clear()
            Me.txtAcc4.Clear()
            Me.txtAcc5.Clear()
        Else
            Me.txtAcc1.Text = e.Node.Parent.Parent.Parent.Parent.Text
            Me.txtAcc2.Text = e.Node.Parent.Parent.Parent.Text
            Me.txtAcc3.Text = e.Node.Parent.Parent.Text
            Me.txtAcc4.Text = e.Node.Parent.Text
            Me.txtAcc5.Text = e.Node.Text
            Me.txtAmount.Focus()
        End If
    End Sub

    Private Sub TreeAcc_AfterSelect_2(sender As System.Object, e As System.Windows.Forms.TreeViewEventArgs) Handles TreeAcc.AfterSelect
        If e.Node.Level <> 4 Then
            Me.txtAcc1.Clear()
            Me.txtAcc2.Clear()
            Me.txtAcc3.Clear()
            Me.txtAcc4.Clear()
            Me.txtAcc5.Clear()
        Else
            Me.txtAcc1.Text = e.Node.Parent.Parent.Parent.Parent.Text
            Me.txtAcc2.Text = e.Node.Parent.Parent.Parent.Text
            Me.txtAcc3.Text = e.Node.Parent.Parent.Text
            Me.txtAcc4.Text = e.Node.Parent.Text
            Me.txtAcc5.Text = e.Node.Text
            Me.txtAmount.Focus()
        End If
    End Sub
End Class